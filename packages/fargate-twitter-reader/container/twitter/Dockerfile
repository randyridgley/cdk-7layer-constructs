FROM amazonlinux:latest

RUN yum -y update && \
  yum -y install wget && \
  yum -y install tar.x86_64 && \
  yum -y install gzip && \
  yum -y install which && \
  yum -y install make gcc* && \
  yum -y install zip && \
  yum -y install python3 && \
  yum -y install python3-pip && \
  yum clean all

RUN pip3 install --user boto3
ENV AWS_DEFAULT_REGION ${AWS_DEFAULT_REGION}

WORKDIR /home/ec2-user
RUN mkdir twitterApp
COPY ./reader /home/ec2-user/twitterApp

RUN chmod ugo+x /home/ec2-user/*
USER root
WORKDIR /home/ec2-user/twitterApp
RUN pip3 install --user -r requirements.txt

ENTRYPOINT [ "python3", "twitter-streaming.py" ]